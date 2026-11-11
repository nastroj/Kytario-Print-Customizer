import { cleanSongbookTitle } from './normalizeSongbook';
import { formatCoverDisplayUrl } from './urlSlug';

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

export function extractPlaylistToken(input: string): string | null {
  if (!input) return null;
  const match = input.match(/[?&]playlist=([^&#]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]).trim();
  }
  const plPathMatch = input.match(/\/playlists\/([^\/\?#]+)/i);
  if (plPathMatch && plPathMatch[1]) {
    return decodeURIComponent(plPathMatch[1]).trim();
  }
  return null;
}

export function extractPlaylistsFromHtml(html: string): any[] {
  if (!html || typeof html !== 'string') return [];

  let idx = html.indexOf('"playlists":[');
  let isEscaped = false;
  if (idx === -1) {
    idx = html.indexOf('\\"playlists\\":[');
    isEscaped = true;
  }
  if (idx === -1) return [];

  const prefix = isEscaped ? '\\"playlists\\":' : '"playlists":';
  let pos = idx + prefix.length;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  const startPos = pos;

  while (pos < html.length) {
    const ch = html[pos];
    if (escapeNext) {
      escapeNext = false;
    } else if (ch === '\\') {
      escapeNext = true;
    } else if (ch === '"') {
      inString = !inString;
    } else if (!inString) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          pos++;
          break;
        }
      }
    }
    pos++;
  }

  let slice = html.slice(startPos, pos);
  if (isEscaped) {
    slice = slice.replace(/\\\\\"/g, '"').replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
  }

  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  // Known Kytario URL prefixes: locale codes, API paths and section slugs that are
  // never a songbook/project token by themselves.
  const ignoredSegments = new Set([
    'api',
    'v1',
    'v2',
    'public',
    'songbook',
    'songbooks',
    'zpevnik',
    'zpevniky',
    'pisnicka',
    'pisnicky',
    'sections',
    'export',
    'shared',
    'cs',
    'sk',
    'en',
    'de',
    'pl',
    'user',
    'users',
    'print',
    'songs',
    'song',
    'edit',
    'view',
    'share',
    'settings',
    'details',
    'info',
    'embed',
    'preview',
    'layout',
    'customizer',
  ]);

  // Prefix segments after which the NEXT segment is always the real songbook/project token.
  const prefixSegments = new Set([
    'songbook',
    'songbooks',
    'zpevnik',
    'zpevniky',
    'pisnicka',
    'pisnicky',
    'project',
    'projects',
    'projekty',
    'projekt',
    'shared',
  ]);

  // Walk the path from the end backwards so patterns like
  // kytario.com/<lang>/projekty/<slug>, kytario.com/projects/<slug> or
  // kytario.com/pisnicky/<slug> resolve to the actual slug instead of an
  // intermediate word such as "projekty" or "pisnicky".
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i].toLowerCase();
    if (/^index(?:-\d+)?$/i.test(seg)) continue;
    if (prefixSegments.has(seg)) {
      // The token follows the prefix segment.
      if (i + 1 < segments.length) {
        const next = segments[i + 1];
        if (!ignoredSegments.has(next.toLowerCase()) && !/^index(?:-\d+)?$/i.test(next)) {
          return next;
        }
      }
      continue;
    }
    if (!ignoredSegments.has(seg)) {
      return segments[i];
    }
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

function sanitizeExtractedTitle(rawTitle: string, token?: string): string | null {
  if (!rawTitle) return null;
  let text = decodeHtmlEntities(rawTitle).trim();

  text = cleanSongbookTitle(text);

  if (!text) return null;

  // Ignore generic fallback titles
  const lower = text.toLowerCase();
  if (
    lower === 'kytario' ||
    lower === 'songbook' ||
    lower === 'zpěvník' ||
    lower === 'zpevnik' ||
    lower === 'digital songbook' ||
    lower === 'digitální zpěvník' ||
    (token && lower === token.trim().toLowerCase())
  ) {
    return null;
  }

  return text;
}

function sanitizeExtractedHeading(rawHeading: string, token?: string): string | null {
  if (!rawHeading) return null;
  const text = decodeHtmlEntities(rawHeading)
    .replace(/\s*(?:\||-|–|—)\s*Kytario.*$/i, '')
    .trim();
  const lower = text.toLowerCase();
  if (
    !text ||
    lower === 'kytario' ||
    lower === 'songbook' ||
    lower === 'zpěvník' ||
    lower === 'zpevnik' ||
    lower === 'digital songbook' ||
    lower === 'digitální zpěvník' ||
    (token && lower === token.trim().toLowerCase())
  ) {
    return null;
  }
  return text;
}

export function extractProjectHeadingFromHtml(html: string, token?: string): string | null {
  if (typeof html !== 'string') return null;
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match?.[1]) return null;
  const heading = h1Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return sanitizeExtractedHeading(heading, token);
}

export function extractTitleFromHtml(html: string, token?: string): string | null {
  if (typeof html !== 'string') return null;

  // 1. Page Heading <h1> (Authoritative source for Kytario songbook titles per user requirements)
  const heading = extractProjectHeadingFromHtml(html, token);
  if (heading) return heading;

  // 2. OpenGraph / Twitter / Standard Meta Tags
  const metaRegex =
    /<meta\s+[^>]*?(?:property|name)=["'](?:og:title|twitter:title|title)["']\s+content=["']([^"']+)["']/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    if (metaMatch[1]) {
      const clean = sanitizeExtractedTitle(metaMatch[1], token);
      if (clean) return clean;
    }
  }

  const metaRevRegex =
    /<meta\s+[^>]*?content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:title|twitter:title|title)["']/gi;
  while ((metaMatch = metaRevRegex.exec(html)) !== null) {
    if (metaMatch[1]) {
      const clean = sanitizeExtractedTitle(metaMatch[1], token);
      if (clean) return clean;
    }
  }

  // 3. <title> Tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const clean = sanitizeExtractedTitle(titleMatch[1], token);
    if (clean) return clean;
  }

  const strongMatch = html.match(/<strong>\s*([^<]+?)\s*<\/strong>/i);
  if (strongMatch && strongMatch[1]) {
    const clean = sanitizeExtractedTitle(strongMatch[1], token);
    if (clean) return clean;
  }

  // 4. JSON-LD Structured Data (Fallback - ignore if obj.name equals author name)
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of ldMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj) {
        const authorName = obj.author?.name || obj.byArtist?.name;
        const candidate =
          obj.songbookName || obj.headline || (obj.name !== authorName ? obj.name : null);
        if (candidate && typeof candidate === 'string') {
          const clean = sanitizeExtractedTitle(candidate, token);
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
  if (Array.isArray(data.songbookSongs) && data.songbookSongs.length > 0) return true;
  if (Array.isArray(data.songs) && data.songs.length > 0) return true;
  if (Array.isArray(data.sections) && data.sections.length > 0) return true;
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data.some((s: any) => s && (s.content || s.lyrics || s.sections || s.text || s.song))
  )
    return true;
  return false;
}

export function extractEmbeddedJsonFromHtml(html: string, playlistToken?: string): any | null {
  if (typeof html !== 'string') return null;

  // 1b. Check extracted playlists from RSC / script chunks ONLY if a playlist was requested
  if (playlistToken) {
    try {
      const playlists = extractPlaylistsFromHtml(html);
      if (playlists.length > 0) {
        const matchedPlaylist =
          playlists.find(
            (p: any) =>
              (p.urlToken && p.urlToken.toLowerCase() === playlistToken.toLowerCase()) ||
              String(p.id) === playlistToken ||
              (p.name && p.name.toLowerCase() === playlistToken.toLowerCase()),
          ) || playlists[0];
        const plSongs =
          matchedPlaylist.songs ||
          matchedPlaylist.items ||
          matchedPlaylist.playlistSongs ||
          matchedPlaylist.tracks ||
          [];
        if (plSongs.length > 0) {
          const allSongsCandidates: any[] = [];
          const jsonScriptMatches = html.matchAll(
            /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
          );
          for (const m of jsonScriptMatches) {
            try {
              const parsed = JSON.parse(m[1]);
              if (parsed && Array.isArray(parsed.songbookSongs)) {
                allSongsCandidates.push(...parsed.songbookSongs.map((i: any) => i.song || i));
              } else if (parsed && Array.isArray(parsed.songs)) {
                allSongsCandidates.push(...parsed.songs);
              } else if (parsed && Array.isArray(parsed.sections)) {
                allSongsCandidates.push(...parsed.sections);
              }
            } catch {}
          }

          const songMap = new Map<string, any>();
          for (const s of allSongsCandidates) {
            if (s) {
              if (s.id != null) songMap.set(String(s.id), s);
              if (s.urlToken) songMap.set(String(s.urlToken), s);
              if (s.name) songMap.set(String(s.name).toLowerCase(), s);
              if (s.title) songMap.set(String(s.title).toLowerCase(), s);
            }
          }

          const resolvedSongs = plSongs
            .map((plItem: any, idx: number) => {
              const plSong = plItem.song || plItem;
              const songId = String(
                plSong.id || plSong.songId || plItem.songId || plItem.id || '',
              );
              const fullSong =
                songMap.get(songId) ||
                (plSong.urlToken ? songMap.get(String(plSong.urlToken)) : null) ||
                (plSong.name ? songMap.get(String(plSong.name).toLowerCase()) : null) ||
                (plSong.title ? songMap.get(String(plSong.title).toLowerCase()) : null) ||
                plSong;
              return {
                ...fullSong,
                id: fullSong.id || plSong.id || `pl-song-${idx + 1}`,
                name: fullSong.name || plSong.name,
                title: fullSong.title || plSong.name || fullSong.name,
                orderIndex: plItem.orderIndex !== undefined ? plItem.orderIndex : idx,
              };
            })
            .filter(
              (s: any) =>
                s && (s.content || s.lyrics || s.sections || s.text || s.title),
            );

          if (resolvedSongs.length > 0) {
            const playlistTitle = matchedPlaylist.name || matchedPlaylist.title || 'Playlist';
            return {
              title: playlistTitle,
              name: playlistTitle,
              songbookTitle: playlistTitle,
              songs: resolvedSongs,
            };
          }
        }
      }
    } catch {}
  }

  // 1. Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      const pageProps = parsed?.props?.pageProps;
      if (pageProps) {
        // Handle Playlist if present in pageProps AND requested
        const playlistData =
          playlistToken
            ? pageProps.playlist || pageProps.playlistData || pageProps.activePlaylist
            : null;
        const songbookData =
          pageProps.songbook ||
          pageProps.sections ||
          pageProps.data ||
          pageProps.project ||
          pageProps;

        if (playlistData) {
          const plSongs =
            playlistData.songs ||
            playlistData.items ||
            playlistData.playlistSongs ||
            playlistData.tracks;
          if (Array.isArray(plSongs) && plSongs.length > 0) {
            const allSongs =
              songbookData?.songs ||
              songbookData?.sections ||
              songbookData?.songbookSongs?.map((i: any) => i.song) ||
              songbookData ||
              [];

            const resolvedSongs = plSongs
              .map((item: any) => {
                if (item && (item.content || item.lyrics || item.sections || item.text)) {
                  return item;
                }
                const songId = item.id || item.songId || item.slug || item.urlToken;
                const found = Array.isArray(allSongs)
                  ? allSongs.find(
                      (s: any) =>
                        s.id === songId ||
                        s.slug === songId ||
                        s.urlToken === songId ||
                        s.title === item.title,
                    )
                  : null;
                return found || item;
              })
              .filter(
                (s: any) => s && (s.content || s.lyrics || s.sections || s.text || s.title),
              );

            if (resolvedSongs.length > 0) {
              const playlistTitle = playlistData.name || playlistData.title;
              const baseTitle = songbookData.title || songbookData.name || 'Songbook';
              const combinedTitle = playlistTitle ? `${baseTitle} - ${playlistTitle}` : baseTitle;
              return {
                ...songbookData,
                title: combinedTitle,
                name: combinedTitle,
                songbookTitle: combinedTitle,
                songs: resolvedSongs,
                sections: undefined,
                songbookSongs: undefined,
              };
            }
          }
        }

        const candidate =
          pageProps.songbook || pageProps.sections || pageProps.data || pageProps.project;
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

  // 2. JSON-LD structured data script tags (includes single song MusicComposition)
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of ldMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
          ? parsed['@graph']
          : [parsed];

      for (const item of items) {
        if (!item) continue;
        if (item['@type'] === 'MusicComposition' || item['@type'] === 'MusicRecording') {
          const songName = item.name || item.headline || 'Song';
          const lyricsText = item.lyrics?.text || item.text || '';
          const artistName = item.composer?.name || item.byArtist?.name || item.author?.name || '';
          if (lyricsText) {
            return {
              title: songName,
              name: songName,
              songs: [
                {
                  title: songName,
                  name: songName,
                  content: lyricsText,
                  lyrics: lyricsText,
                  artist: artistName,
                  key: item.musicalKey,
                  tonalKey: item.musicalKey,
                  genre: item.genre,
                },
              ],
            };
          }
        }
        if (hasSongsPayload(item)) {
          return item;
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Next.js App Router RSC Stream search for song or songbook JSON
  const rscSongRegex =
    /"song"\s*:\s*(\{(?:(?!<script)[\s\S])*?"sections"\s*:\s*\[[\s\S]*?\]\s*\})/g;
  let rscMatch;
  while ((rscMatch = rscSongRegex.exec(html)) !== null) {
    try {
      const songData = JSON.parse(rscMatch[1]);
      if (songData && (songData.name || songData.title)) {
        return {
          title: songData.name || songData.title,
          name: songData.name || songData.title,
          songs: [songData],
        };
      }
    } catch {}
  }

  // 4. Any application/json script tag containing songs or sections
  const jsonScriptMatches = html.matchAll(
    /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
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
    const cleanRaw = rawUrl.trim().split('#')[0];
    candidateUrls.push(cleanRaw);
    if (cleanRaw.toLowerCase() !== cleanRaw) {
      candidateUrls.push(cleanRaw.toLowerCase());
    }
    const playlistMatch = cleanRaw.match(/[?&]playlist=([^&]+)/i);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      const baseWithoutQuery = cleanRaw.split('?')[0];
      candidateUrls.push(`https://kytario.com/playlists/${playlistId}`);
      candidateUrls.push(`https://kytario.com/api/playlists/${playlistId}`);
      candidateUrls.push(`${baseWithoutQuery}/playlists/${playlistId}`);
    }
  }

  const candidateTokens = Array.from(
    new Set([token, token.toLowerCase(), token.toUpperCase()].filter(Boolean)),
  );

  for (const tok of candidateTokens) {
    candidateUrls.push(`https://kytario.com/api/songbooks/${tok}/sections`);
    candidateUrls.push(`https://kytario.com/cs/${tok}`);
    candidateUrls.push(`https://kytario.com/sk/${tok}`);
    candidateUrls.push(`https://kytario.com/en/${tok}`);
    candidateUrls.push(`https://kytario.com/${tok}`);
    candidateUrls.push(`https://kytario.com/zpevnik/${tok}`);
    candidateUrls.push(`https://kytario.com/api/v1/songbooks/${tok}/sections`);
    candidateUrls.push(`https://kytario.com/api/songbooks/${tok}`);
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

async function enrichTitleInClient(data: any, token: string) {
  if (!data) return;

  const candidateTokens = Array.from(
    new Set([token, token.toLowerCase(), token.toUpperCase()].filter(Boolean)),
  );

  // The PDF endpoint exposes the songbook's canonical title directly.
  for (const tok of candidateTokens) {
    try {
      const pdfUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(tok)}/pdf`;
      const res = await fetch(pdfUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const disposition = res.headers.get('content-disposition');
        const match =
          disposition?.match(/filename\*=UTF-8''([^;]+)/i) ||
          disposition?.match(/filename="([^"]+)"/i);
        if (match?.[1]) {
          const clean = sanitizeExtractedHeading(
            decodeURIComponent(match[1]).replace(/\.pdf$/i, ''),
            tok,
          );
          if (clean) {
            data.title = clean;
            data.name = clean;
            data.songbookTitle = clean;
            return;
          }
        }
      }
    } catch {
      // Fall back to the exact public songbook pages below.
    }
  }

  const urls = candidateTokens.flatMap((tok) => [
    `https://kytario.com/${encodeURIComponent(tok)}`,
    `https://kytario.com/${encodeURIComponent(tok)}/index-1`,
  ]);
  const pages = await Promise.all(
    urls.map(async (pageUrl) => {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) return null;
        const wrapper = await response.json();
        if (typeof wrapper?.contents !== 'string') return null;
        if (
          typeof wrapper.status?.url === 'string' &&
          !isPageForKytarioToken(wrapper.status.url, token)
        ) {
          return null;
        }
        return extractProjectHeadingFromHtml(wrapper.contents, token);
      } catch {
        return null;
      }
    }),
  );
  const title = pages.find(Boolean);
  if (title) {
    data.title = title;
    data.name = title;
    data.songbookTitle = title;
  }
}

function isPageForKytarioToken(pageUrl: string, token: string): boolean {
  try {
    const parsedUrl = new URL(pageUrl);
    if (!['kytario.com', 'www.kytario.com'].includes(parsedUrl.hostname.toLowerCase())) {
      return false;
    }

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (['cs', 'sk', 'en'].includes(segments[0]?.toLowerCase())) segments.shift();
    return (
      segments[0]?.toLowerCase() === token.toLowerCase() &&
      (segments.length === 1 || /^index(?:-\d+)?$/i.test(segments[1]))
    );
  } catch {
    return false;
  }
}

export function extractSongbookTokensFromProjectHtml(
  html: string,
): { token: string; name: string }[] {
  if (typeof html !== 'string') return [];
  const results: { token: string; name: string }[] = [];

  let idx = html.indexOf('"songbooks":[');
  let isEscaped = false;
  if (idx === -1) {
    idx = html.indexOf('\\"songbooks\\":[');
    isEscaped = true;
  }

  if (idx !== -1) {
    let depth = 1;
    let pos = idx + (isEscaped ? '\\"songbooks\\":['.length : '"songbooks":['.length);
    while (pos < html.length && depth > 0) {
      if (html[pos] === '[') depth++;
      else if (html[pos] === ']') depth--;
      pos++;
    }
    let slice = html.slice(
      idx + (isEscaped ? '\\"songbooks\\":'.length : '"songbooks":'.length),
      pos,
    );
    if (isEscaped) {
      slice = slice.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    try {
      const arr = JSON.parse(slice);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item && item.urlToken) {
            results.push({
              token: String(item.urlToken),
              name: String(item.name || item.title || 'Songbook'),
            });
          }
        }
      }
    } catch {
      const matches = slice.matchAll(/"urlToken"\s*:\s*"([^"]+)"/g);
      for (const m of matches) {
        if (m[1]) {
          results.push({ token: m[1], name: 'Songbook' });
        }
      }
    }
  }

  const byToken = new Map<string, string>();
  for (const r of results) {
    const existing = byToken.get(r.token);
    if (existing === undefined || (!existing && r.name)) {
      byToken.set(r.token, r.name);
    }
  }

  return Array.from(byToken.entries()).map(([token, name]) => ({
    token,
    name: name || 'Songbook',
  }));
}

/**
 * Fast control function to verify if a Kytario songbook URL/token exists before full fetching.
 * If 404 or 400 is returned, fails immediately without freezing or hanging on slow proxies.
 */
export async function checkSongbookExists(
  tokenOrUrl: string,
): Promise<{ exists: boolean; status?: number; error?: string; resolvedToken?: string }> {
  try {
    const rawToken = extractKytarioSlug(tokenOrUrl) || tokenOrUrl.trim();
    if (!rawToken) return { exists: false, error: 'Empty songbook token' };

    const candidateTokens = Array.from(
      new Set([rawToken, rawToken.toLowerCase(), rawToken.toUpperCase()].filter(Boolean)),
    );

    const configuredProxyUrl = getStoredProxyUrl();
    const isStaticHost =
      typeof window !== 'undefined' &&
      (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:');

    // 1. Try local/configured proxy if available (avoids browser CORS issues)
    if (configuredProxyUrl || !isStaticHost) {
      const proxyBase = configuredProxyUrl || '/api/proxy/kytario';
      if (!proxyBase.includes('?url=')) {
        for (const token of candidateTokens) {
          try {
            const proxyCheckUrl = `${proxyBase.replace(/\/+$/, '')}/${encodeURIComponent(token)}`;
            const res = await fetch(proxyCheckUrl, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              return { exists: true, status: res.status, resolvedToken: token };
            }
            if (res.status === 404) {
              continue;
            }
            return { exists: true };
          } catch {
            // Fall through if proxy call fails
          }
        }
      }
    }

    // Static hosts cannot inspect Kytario's API directly because of browser CORS.
    // Avoid waiting on a request that the browser will be unable to read.
    if (isStaticHost) return { exists: true };

    // 2. Direct fetch attempt to kytario.com
    let saw404 = false;
    for (const token of candidateTokens) {
      const checkUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(token)}/sections`;
      try {
        const res = await fetch(checkUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          return { exists: true, status: res.status, resolvedToken: token };
        }
        if (res.status === 404 || res.status === 400) {
          saw404 = true;
        }
      } catch {
        // Direct fetch failed (e.g. browser CORS block) -> DO NOT assume 404!
        // Return exists: true so the full fetch pipeline (proxy/relays) can run.
        return { exists: true };
      }
    }

    if (saw404) {
      return {
        exists: false,
        status: 404,
        error: `Songbook "${rawToken}" was not found (404).`,
      };
    }

    return { exists: true };
  } catch (err: any) {
    return { exists: true };
  }
}

/**
 * Retrieves the currently configured Kytario proxy URL, either from local storage or build-time environment.
 */
export function getStoredProxyUrl(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('kytario_proxy_url')?.trim();
    if (local) return local;
  }
  try {
    return (import.meta as any)?.env?.VITE_KYTARIO_PROXY_URL?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Stores or clears a custom Kytario proxy URL in local storage.
 */
export function setStoredProxyUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim();
  if (clean) {
    localStorage.setItem('kytario_proxy_url', clean);
  } else {
    localStorage.removeItem('kytario_proxy_url');
  }
}

export async function fetchSongbookFromKytario(url: string): Promise<any> {
  let cleanUrl = cleanKytarioUrl(url);
  let token = extractKytarioSlug(cleanUrl);
  const configuredProxyUrl = getStoredProxyUrl();
  const isStaticHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:');

  if (!token && !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Please enter a valid Kytario songbook URL or code.');
  }

  // If it's an explicit project URL/token, let the client resolve it if possible (static host fallback)
  const isProjectUrl = /(?:^|\/)(?:cs|en|sk|de)?\/?(?:projekty|projects)\/([^\/\?#]+)/i.test(
    cleanUrl,
  );
  if (isProjectUrl && token && isStaticHost && !configuredProxyUrl) {
    try {
      const pageUrls = [
        `https://kytario.com/cs/projekty/${token}`,
        `https://kytario.com/projects/${token}`,
      ];
      let projectContents = '';
      for (const pageUrl of pageUrls) {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
        try {
          const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
          if (res.ok) {
            const wrapper = await res.json();
            if (wrapper && wrapper.contents) {
              projectContents = wrapper.contents;
              break;
            }
          }
        } catch {
          // Try next project page variant
        }
      }
      if (projectContents) {
        const songbooks = extractSongbookTokensFromProjectHtml(projectContents);
        if (songbooks.length > 0) {
          console.log(
            `[Client] Resolved project "${token}" to songbook: "${songbooks[0].token}"`,
          );
          token = songbooks[0].token;
          cleanUrl = `https://kytario.com/cs/${token}`;
        }
      }
    } catch (e: any) {
      console.warn('[Client] Project resolution fallback error:', e?.message);
    }
  }

  const targetParam = token || cleanUrl;

  const playlistToken = extractPlaylistToken(url) || extractPlaylistToken(cleanUrl) || '';

  // Prefer a configured hosted proxy on static hosts, otherwise use the local backend.
  if (configuredProxyUrl || !isStaticHost) {
    try {
      const proxyBase = configuredProxyUrl || '/api/proxy/kytario';
      let proxyUrl = '';
      if (proxyBase.endsWith('?') || proxyBase.includes('?url=')) {
        const targetApi = `https://kytario.com/api/songbooks/${encodeURIComponent(token || targetParam)}/sections`;
        proxyUrl = `${proxyBase}${encodeURIComponent(targetApi)}`;
      } else {
        proxyUrl = `${proxyBase.replace(/\/+$/, '')}/${encodeURIComponent(targetParam)}?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token || '')}${playlistToken ? `&playlist=${encodeURIComponent(playlistToken)}` : ''}`;
      }

      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });
      if (response.ok) {
        const data = await response.json();
        if (data && hasSongsPayload(data)) {
          const resolvedToken =
            data.urlToken ||
            data.slug ||
            extractKytarioSlug(data.url || '') ||
            extractKytarioSlug(data.slug || '') ||
            token;
          const canonicalUrl = resolvedToken
            ? `https://kytario.com/${resolvedToken}${
                playlistToken ? `?playlist=${encodeURIComponent(playlistToken)}` : ''
              }`
            : data.url || '';

          if (resolvedToken) {
            data.urlToken = resolvedToken;
            data.slug = resolvedToken;
          }
          if (canonicalUrl) {
            data.url = canonicalUrl;
            data.shortUrl = formatCoverDisplayUrl(canonicalUrl);
          } else if (data.url) {
            data.shortUrl = formatCoverDisplayUrl(data.url);
          }
          return data;
        }
      } else {
        const status = response.status;
        if (status === 404 || status === 400) {
          let errMsg = `Kytario proxy error (Status ${status})`;
          try {
            const errBody = await response.json();
            errMsg = errBody?.error || errMsg;
          } catch {}
          throw new KytarioFetchError(errMsg, {
            isCorsOrStaticHost: false,
            token: token || '',
            apiUrl: `https://kytario.com/api/songbooks/${token}/sections`,
            webUrl: `https://kytario.com/${token}`,
          });
        }
      }
    } catch (err: any) {
      if (err instanceof KytarioFetchError) throw err;
      console.warn(
        'Configured Kytario proxy not available, attempting client-side fallback strategies:',
        err?.message,
      );
    }
  }

  // Next, try client-side direct access and public CORS proxies
  if (token || cleanUrl) {
    try {
      const clientData = await fetchViaPublicProxies(token, cleanUrl);
      if (clientData) {
        await enrichTitleInClient(clientData, token);
        const resolvedToken =
          clientData.urlToken ||
          clientData.slug ||
          extractKytarioSlug(clientData.url || '') ||
          extractKytarioSlug(clientData.slug || '') ||
          token;
        const canonicalUrl = resolvedToken
          ? `https://kytario.com/${resolvedToken}${
              playlistToken ? `?playlist=${encodeURIComponent(playlistToken)}` : ''
            }`
          : clientData.url || '';

        if (resolvedToken) {
          clientData.urlToken = resolvedToken;
          clientData.slug = resolvedToken;
        }
        if (canonicalUrl) {
          clientData.url = canonicalUrl;
          clientData.shortUrl = formatCoverDisplayUrl(canonicalUrl);
        } else if (clientData.url) {
          clientData.shortUrl = formatCoverDisplayUrl(clientData.url);
        }
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
