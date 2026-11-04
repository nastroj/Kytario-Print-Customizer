// Clean up invalid global __dirname / __filename if set to '.' by runtime environment
if (typeof globalThis !== 'undefined') {
  if ((globalThis as any).__dirname === '.') {
    delete (globalThis as any).__dirname;
  }
  if ((globalThis as any).__filename === '.') {
    delete (globalThis as any).__filename;
  }
}

import express from 'express';
import http from 'http';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const distPath = path.join(__dirname, 'dist');
  const isDev = process.env.npm_lifecycle_event === 'dev' || process.env.NODE_ENV === 'development';
  const isProd = !isDev && (process.env.NODE_ENV === 'production' || fs.existsSync(distPath));

  // Load .env file into process.env if present
  const envFilePath = path.join(__dirname, '.env');
  if (fs.existsSync(envFilePath)) {
    try {
      const envContent = fs.readFileSync(envFilePath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        const varKey = key?.trim();
        if (varKey && !(varKey in process.env)) {
          process.env[varKey] = vals
            .join('=')
            .trim()
            .replace(/^["']|["']$/g, '');
        }
      }
    } catch {}
  }

  const envBase = (process.env.BASE_PATH || process.env.BASE_URL || '').trim();
  let expressBase = '/';
  if (envBase && envBase !== './' && envBase !== '.') {
    expressBase = envBase.startsWith('/') ? envBase : `/${envBase}`;
    if (!expressBase.endsWith('/')) {
      expressBase = `${expressBase}/`;
    }
  }

  // Health check for Cloud Run
  app.get('/health', (req, res) => res.status(200).send('OK'));

  function cleanKytarioUrl(input: string): string {
    if (!input) return '';
    let str = input.trim();
    // Strip trailing /index-1 or /index-\d+ or /index at the end of the URL/path before query/hash or end
    str = str.replace(/\/index(?:-\d+)?\/?(?=[?#]|$)/i, '');
    return str;
  }

  function extractPlaylistToken(input: string): string | null {
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

  function extractPlaylistsFromHtml(html: string): any[] {
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

  function extractKytarioSlug(input: string): string {
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
          if (!ignore.has(next.toLowerCase()) && !/^index(?:-\d+)?$/i.test(next)) {
            return next;
          }
        }
        continue;
      }
      if (!ignore.has(seg)) {
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

  function cleanSongbookTitle(rawTitle: string): string {
    if (!rawTitle || typeof rawTitle !== 'string') return '';
    let text = rawTitle.trim();

    // Strip trailing site brand identifiers
    text = text.replace(/\s*(?:\||-|–|—)\s*Kytario.*$/i, '').trim();
    text = text.replace(/\s*(?:\||-|–|—)\s*(?:Digitální zpěvník|Digital Songbook).*$/i, '').trim();

    // Strip parenthesized or bracketed terms
    text = text
      .replace(
        /\s*[\(\[](?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\)\]]/i,
        '',
      )
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

  function sanitizeExtractedTitle(rawTitle: string, _token?: string): string | null {
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
      lower === 'digitální zpěvník'
    ) {
      return null;
    }

    return text;
  }

  function extractTitleFromHtml(html: string, token?: string): string | null {
    if (typeof html !== 'string') return null;

    // 1. Page Heading <h1> (Authoritative source for Kytario songbook titles per user requirements)
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      const stripped = h1Match[1].replace(/<[^>]+>/g, '').trim();
      const clean = sanitizeExtractedTitle(stripped, token);
      if (clean) return clean;
    }

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

  function extractEmbeddedJsonFromHtml(html: string): any | null {
    if (typeof html !== 'string') return null;

    // 1. Next.js __NEXT_DATA__
    const nextDataMatch = html.match(
      /<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
    );
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const parsed = JSON.parse(nextDataMatch[1]);
        const pageProps = parsed?.props?.pageProps;
        if (pageProps) {
          // Handle Playlist if present in pageProps
          const playlistData =
            pageProps.playlist || pageProps.playlistData || pageProps.activePlaylist;
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
            const artistName =
              item.composer?.name || item.byArtist?.name || item.author?.name || '';
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

  function extractSongbookTokensFromProjectHtml(html: string): { token: string; name: string }[] {
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

    // Fallback: collect songbook tokens referenced by links in the HTML. Generic
    // "Songbook" names are only used as a last resort so that any real name found
    // elsewhere (e.g. in the embedded JSON payload) wins during de-duplication.
    const linkRegex =
      /\/(?:songbooks?|zpevnik|zpevniky|pisnicky|projekty|projects|project|shared)\/([a-zA-Z0-9_\-]+)/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const tok = m[1];
      if (tok && tok !== 'cs' && tok !== 'en' && tok !== 'sk' && tok !== 'de') {
        results.push({ token: tok, name: '' });
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

  async function fetchKytarioWebpageTitle(token: string, rawUrl?: string): Promise<string | null> {
    if (!token && !rawUrl) return null;

    const candidateTokens = Array.from(
      new Set([token, token.toLowerCase(), token.toUpperCase()].filter(Boolean)),
    );

    // 1. Primary: Webpage HTML scraping directly from http://kytario.com/<input url> and /index-1
    const urlsToTry: string[] = [];

    if (rawUrl && rawUrl.trim()) {
      const cleanRaw = rawUrl.trim().split('#')[0].split('?')[0].replace(/\/index(?:-\d+)?\/?$/i, '');
      if (/^https?:\/\//i.test(cleanRaw)) {
        urlsToTry.push(cleanRaw);
        urlsToTry.push(`${cleanRaw}/index-1`);
        if (cleanRaw.startsWith('https://')) {
          urlsToTry.push(cleanRaw.replace('https://', 'http://'));
          urlsToTry.push(`${cleanRaw.replace('https://', 'http://')}/index-1`);
        }
      } else {
        const withoutDomain = cleanRaw.replace(/^(?:https?:\/\/)?(?:www\.)?kytario\.com\/?/i, '');
        if (withoutDomain) {
          urlsToTry.push(`https://kytario.com/${withoutDomain}`);
          urlsToTry.push(`https://kytario.com/${withoutDomain}/index-1`);
          urlsToTry.push(`http://kytario.com/${withoutDomain}`);
          urlsToTry.push(`http://kytario.com/${withoutDomain}/index-1`);
        }
      }
    }

    for (const tok of candidateTokens) {
      urlsToTry.push(`https://kytario.com/${tok}`);
      urlsToTry.push(`https://kytario.com/${tok}/index-1`);
      urlsToTry.push(`http://kytario.com/${tok}`);
      urlsToTry.push(`http://kytario.com/${tok}/index-1`);
      urlsToTry.push(`https://kytario.com/cs/${tok}`);
      urlsToTry.push(`https://kytario.com/cs/${tok}/index-1`);
      urlsToTry.push(`https://kytario.com/sk/${tok}`);
      urlsToTry.push(`https://kytario.com/en/${tok}`);
      urlsToTry.push(`https://kytario.com/zpevnik/${tok}`);
    }

    const uniqueUrls = Array.from(new Set(urlsToTry));

    for (const pageUrl of uniqueUrls) {
      try {
        const res = await axios.get(pageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 6000,
        });
        const html = res.data;
        if (typeof html === 'string') {
          const title = extractTitleFromHtml(html, token);
          if (title) {
            return title;
          }
        }
      } catch (e) {
        // Try next candidate URL
      }
    }

    // 2. Canonical check fallback: inspect Content-Disposition on the PDF export endpoint
    for (const tok of candidateTokens) {
      try {
        const headRes = await axios.head(
          `https://kytario.com/api/songbooks/${encodeURIComponent(tok)}/pdf`,
          {
            timeout: 4000,
            validateStatus: (s) => s === 200,
          },
        );
        const cd = headRes.headers['content-disposition'];
        if (cd) {
          const match = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="([^"]+)"/i);
          if (match && match[1]) {
            let filename = decodeURIComponent(match[1])
              .replace(/\.pdf$/i, '')
              .trim();
            filename = filename.replace(/^'+|'+$/g, '').trim();
            const clean = sanitizeExtractedTitle(filename, tok);
            if (clean) {
              return clean;
            }
          }
        }
      } catch {}
    }

    return null;
  }

  // Kytario API Proxy with robust endpoint fallbacks
  app.all(['/api/proxy/kytario', '/api/proxy/kytario/:token(*)'], async (req, res) => {
    let rawInput =
      (req.query.url as string) ||
      (req.query.token as string) ||
      (req.params as any).token ||
      (req.params as any)[0] ||
      '';
    let playlistToken =
      (req.query.playlist as string) ||
      extractPlaylistToken(rawInput) ||
      '';
    const originalInput = rawInput;
    rawInput = cleanKytarioUrl(rawInput);
    let token = extractKytarioSlug(rawInput);
    console.log(
      `[Proxy] Fetching songbook for input: "${rawInput}", resolved token: "${token}", playlist: "${playlistToken}"`,
    );

    // If this is a playlist request, execute the dedicated playlist extraction & merging pipeline
    if (playlistToken) {
      console.log(`[Proxy] Processing playlist request: token="${token}", playlist="${playlistToken}"`);
      // If token is missing or 'playlists', try resolving from /playlists listing
      if (!token || token.toLowerCase() === 'playlists') {
        try {
          const plRes = await axios.get('https://kytario.com/playlists', {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 6000,
          });
          if (plRes.data && typeof plRes.data === 'string') {
            const regex = /href="\/([^\/\?"]+)(?:\/index(?:-\d+)?)?\?playlist=([^"&]+)"/gi;
            let m;
            while ((m = regex.exec(plRes.data)) !== null) {
              if (m[2].toLowerCase() === playlistToken.toLowerCase()) {
                token = m[1];
                playlistToken = m[2];
                console.log(`[Proxy] Resolved playlist "${playlistToken}" to songbook "${token}"`);
                break;
              }
            }
          }
        } catch (e: any) {
          console.warn('[Proxy] Failed to resolve playlist listing:', e?.message);
        }
      }

      if (token && token.toLowerCase() !== 'playlists') {
        // 1. Fetch playlist metadata from webpage HTML (try original input first, then reader URLs)
        const playlistWebUrls = [
          originalInput && /^https?:\/\//i.test(originalInput) ? originalInput : '',
          `https://kytario.com/${token}/index-1?playlist=${encodeURIComponent(playlistToken)}`,
          `https://kytario.com/cs/${token}/index-1?playlist=${encodeURIComponent(playlistToken)}`,
          `https://kytario.com/${token}?playlist=${encodeURIComponent(playlistToken)}`,
          `https://kytario.com/cs/${token}?playlist=${encodeURIComponent(playlistToken)}`,
        ].filter(Boolean);

        let playlists: any[] = [];
        let pageHtml = '';

        for (const pUrl of playlistWebUrls) {
          try {
            const pageRes = await axios.get(pUrl, {
              headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              timeout: 10000,
            });
            if (pageRes.data && typeof pageRes.data === 'string') {
              playlists = extractPlaylistsFromHtml(pageRes.data);
              if (playlists.length > 0) {
                pageHtml = pageRes.data;
                break;
              }
            }
          } catch {}
        }

        const matchedPlaylist =
          playlists.find(
            (p: any) =>
              (p.urlToken && p.urlToken.toLowerCase() === playlistToken.toLowerCase()) ||
              String(p.id) === playlistToken ||
              (p.name && p.name.toLowerCase() === playlistToken.toLowerCase()),
          ) || (playlists.length > 0 ? playlists[0] : null);

        // 2. Fetch full songbook sections with lyrics & chords
        const sectionTokens = Array.from(
          new Set([token, token.toLowerCase(), token.toUpperCase()].filter(Boolean)),
        );
        let sectionsData: any = null;

        for (const sTok of sectionTokens) {
          try {
            const secRes = await axios.get(
              `https://kytario.com/api/songbooks/${encodeURIComponent(sTok)}/sections`,
              {
                headers: {
                  Accept: 'application/json, text/plain, */*',
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 15000,
              },
            );
            if (secRes.data && Array.isArray(secRes.data.songbookSongs)) {
              sectionsData = secRes.data;
              break;
            }
          } catch {}
        }

        if (matchedPlaylist && sectionsData) {
          const allSongbookSongs = sectionsData.songbookSongs || sectionsData.songs || [];
          const songMap = new Map<string, any>();
          for (const item of allSongbookSongs) {
            const s = item.song || item;
            if (s) {
              if (s.id !== undefined && s.id !== null) songMap.set(String(s.id), s);
              if (s.urlToken) songMap.set(String(s.urlToken), s);
              if (s.name) songMap.set(String(s.name).toLowerCase(), s);
              if (s.title) songMap.set(String(s.title).toLowerCase(), s);
            }
          }

          const plSongs = [...(matchedPlaylist.songs || [])].sort(
            (a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
          );

          const resolvedSongs = plSongs.map((plItem: any, idx: number) => {
            const plSong = plItem.song || plItem;
            const songId = String(plSong.id || plSong.songId || plSong.urlToken || '');
            const fullSong =
              songMap.get(songId) ||
              (plSong.urlToken ? songMap.get(String(plSong.urlToken)) : null) ||
              (plSong.name ? songMap.get(String(plSong.name).toLowerCase()) : null) ||
              plSong;

            const transposition =
              plItem.transposition !== undefined
                ? plItem.transposition
                : fullSong.transposition !== undefined
                  ? fullSong.transposition
                  : plSong.transposition;

            return {
              ...fullSong,
              id: fullSong.id || plSong.id || `pl-song-${idx + 1}`,
              name: fullSong.name || plSong.name,
              title: fullSong.title || plSong.name || fullSong.name,
              author: fullSong.author || plSong.author,
              interpreter: fullSong.interpreter || plSong.interpreter,
              capo:
                plItem.capo !== undefined
                  ? plItem.capo
                  : fullSong.capo !== undefined
                    ? fullSong.capo
                    : plSong.capo,
              transposition,
              orderIndex: plItem.orderIndex !== undefined ? plItem.orderIndex : idx,
            };
          });

          let webTitle = extractTitleFromHtml(pageHtml, token);
          if (!webTitle) {
            try {
              webTitle = await fetchKytarioWebpageTitle(token, originalInput);
            } catch {}
          }
          const rawBaseTitle = webTitle || sectionsData.title || sectionsData.name || 'Songbook';
          const baseTitle = cleanSongbookTitle(rawBaseTitle);
          const plName = matchedPlaylist.name || matchedPlaylist.title || playlistToken;
          const combinedTitle =
            plName && !baseTitle.toLowerCase().includes(plName.toLowerCase())
              ? `${baseTitle} - ${plName}`
              : plName || baseTitle;

          console.log(
            `[Proxy] Successfully extracted playlist "${combinedTitle}" with ${resolvedSongs.length} songs`,
          );

          const songbookUrl =
            originalInput && /^https?:\/\//i.test(originalInput)
              ? originalInput
              : `https://kytario.com/${token}/index-1?playlist=${encodeURIComponent(playlistToken)}`;

          return res.json({
            id: matchedPlaylist.id || sectionsData.id,
            title: combinedTitle,
            name: combinedTitle,
            songbookTitle: combinedTitle,
            playlistName: plName,
            urlToken: token,
            playlistUrlToken: matchedPlaylist.urlToken || playlistToken,
            url: songbookUrl,
            shortUrl: songbookUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, ''),
            slug: token,
            songs: resolvedSongs,
          });
        }
      }
    }

    const candidateTokens = Array.from(
      new Set([token, token.toLowerCase(), token.toUpperCase()].filter(Boolean)),
    );

    // 1. Resolve project to its underlying first songbook if it is an explicit project page route
    let isProjectUrl = /(?:^|\/)(?:cs|en|sk|de)?\/?(?:projekty|projects)\/([^\/\?#]+)/i.test(rawInput);
    let projectSongbookName: string | null = null;
    if (isProjectUrl && candidateTokens.length > 0) {
      for (const tok of candidateTokens) {
        try {
          console.log(`[Proxy] Resolving project token/URL "${tok}" to find songbooks...`);
          const projectWebpages = [
            `https://kytario.com/cs/projekty/${tok}`,
            `https://kytario.com/projects/${tok}`,
            `https://kytario.com/sk/projekty/${tok}`,
            `https://kytario.com/en/projects/${tok}`,
          ];
          let projectHtml = '';
          for (const pUrl of projectWebpages) {
            try {
              const pres = await axios.get(pUrl, { timeout: 6000 });
              if (pres.data && typeof pres.data === 'string') {
                projectHtml = pres.data;
                break;
              }
            } catch {}
          }
          if (projectHtml) {
            const projectSongbooks = extractSongbookTokensFromProjectHtml(projectHtml);
            if (projectSongbooks.length > 0) {
              console.log(
                `[Proxy] Successfully resolved project "${tok}" to songbook "${projectSongbooks[0].token}" (${projectSongbooks[0].name})`,
              );
              token = projectSongbooks[0].token;
              projectSongbookName = projectSongbooks[0].name || null;
              break;
            }
            isProjectUrl = false;
          } else {
            isProjectUrl = false;
          }
        } catch (e: any) {
          console.warn(`[Proxy] Project resolution error:`, e?.message);
          isProjectUrl = false;
        }
      }
    }

    const candidateUrls: string[] = [];

    // If input is an absolute URL to a sections or api endpoint, try it directly first
    if (/^https?:\/\//i.test(rawInput.trim())) {
      const urlCandidate = rawInput.trim().split('#')[0];
      if (token || !/(?:\/|^)(?:cs|en|sk|de|api|songbooks?|zpevniky?)\/?$/i.test(urlCandidate)) {
        if (urlCandidate.includes('/sections') || urlCandidate.includes('/api/')) {
          candidateUrls.push(urlCandidate);
        }
      }
    }

    for (const tok of candidateTokens) {
      candidateUrls.push(`https://kytario.com/api/songbooks/${tok}/sections`);
      candidateUrls.push(`https://kytario.com/api/v1/songbooks/${tok}/sections`);
      candidateUrls.push(`https://kytario.com/cs/${tok}`);
      candidateUrls.push(`https://kytario.com/sk/${tok}`);
      candidateUrls.push(`https://kytario.com/en/${tok}`);
      candidateUrls.push(`https://kytario.com/${tok}`);
      candidateUrls.push(`https://kytario.com/zpevnik/${tok}`);
      candidateUrls.push(`https://kytario.com/api/songbooks/${tok}`);
      candidateUrls.push(`https://kytario.com/api/v1/songbooks/${tok}`);
      candidateUrls.push(`https://kytario.com/api/songbooks/slug/${tok}`);
      candidateUrls.push(`https://kytario.com/api/public/songbooks/${tok}`);
    }

    if (!token && candidateUrls.length === 0) {
      console.warn(`[Proxy] Invalid or empty songbook token requested: "${rawInput}"`);
      return res.status(400).json({
        error:
          'Invalid Kytario songbook link or code. Please enter a valid songbook name (e.g. "https://kytario.com/your-songbook").',
      });
    }

    const endpoints = Array.from(new Set(candidateUrls));
    let lastError = null;

    for (const targetUrl of endpoints) {
      try {
        const response = await axios.get(targetUrl, {
          headers: {
            Accept: 'application/json, text/html, text/plain, */*',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 15000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status === 200,
        });

        if (response.data) {
          let data = response.data;
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch (e) {
              const embedded = extractEmbeddedJsonFromHtml(data);
              if (embedded) {
                data = embedded;
              } else {
                continue;
              }
            }
          }

          // If the payload has songs or songbookSongs or sections, return immediately
          const hasSongs =
            (data && Array.isArray(data.songbookSongs) && data.songbookSongs.length > 0) ||
            (Array.isArray(data) &&
              data.length > 0 &&
              data.some(
                (s: any) => s && (s.content || s.lyrics || s.sections || s.text || s.song),
              )) ||
            (data && Array.isArray(data.songs) && data.songs.length > 0) ||
            (data && Array.isArray(data.sections) && data.sections.length > 0);

          if (hasSongs) {
            console.log(`[Proxy] Successfully retrieved songbook payload from: ${targetUrl}`);

            // Fetch human-readable songbook name from Kytario public webpage if token or rawInput exists
            if (token || rawInput) {
              try {
                const webTitle = await fetchKytarioWebpageTitle(token, originalInput || rawInput);
                if (webTitle) {
                  console.log(`[Proxy] Enriched songbook title from Kytario page: "${webTitle}"`);
                  data.title = webTitle;
                  data.name = webTitle;
                  data.songbookTitle = webTitle;
                } else if (projectSongbookName && projectSongbookName !== 'Songbook') {
                  // Project pages carry the songbook name in their embedded JSON payload.
                  console.log(
                    `[Proxy] Enriched songbook title from project page: "${projectSongbookName}"`,
                  );
                  data.title = projectSongbookName;
                  data.name = projectSongbookName;
                  data.songbookTitle = projectSongbookName;
                }
              } catch (e) {
                // Ignore title enrichment failure
              }
            }

            const rawTrimmed = (originalInput || rawInput || '').trim();
            let songbookUrl = '';
            if (/^https?:\/\//i.test(rawTrimmed)) {
              songbookUrl = cleanKytarioUrl(rawTrimmed.split('#')[0]);
            } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(rawTrimmed)) {
              songbookUrl = `https://${cleanKytarioUrl(rawTrimmed.split('#')[0])}`;
            } else if (token) {
              songbookUrl = `https://kytario.com/${token}`;
            } else {
              songbookUrl = 'https://kytario.com';
            }

            data.urlToken = token || data.urlToken;
            data.slug = token || data.slug;
            data.url = songbookUrl;
            data.shortUrl = songbookUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

            return res.json(data);
          }
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    const status = lastError?.response?.status || 404;
    if (status === 404) {
      console.log(`[Proxy] Songbook not found (404) for input "${rawInput}" (token "${token}")`);
    } else {
      console.warn(
        `[Proxy] Songbook request failed for input "${rawInput}" (token "${token}"):`,
        lastError?.message,
      );
    }
    res.status(status).json({
      error:
        status === 404
          ? `Songbook "${token || rawInput}" was not found on Kytario. Please check the URL or code.`
          : 'Failed to fetch songbook from Kytario. Please check the URL or code.',
      details: lastError?.message,
    });
  });

  if (!isProd) {
    console.log('Starting in development mode with Vite middleware...');
    try {
      const { createServer: createViteServer } = await import('vite');
      const disableHmr = process.env.DISABLE_HMR === 'true';
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: disableHmr ? false : { server: httpServer },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Failed to initialize Vite server:', err);
      process.exit(1);
    }
  } else {
    console.log(`Starting in production mode, serving from: ${distPath}`);
    if (expressBase !== '/') {
      app.use(expressBase, express.static(distPath));
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Avoid returning index.html for missing static files (like .js, .css, images)
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).send('Not Found');
      }

      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found - dist/index.html missing. Run npm run build first.');
      }
    });
  }

  // Parse CLI args (e.g. --port 3000 or -p 3000)
  let cliPort: number | undefined;
  for (let i = 2; i < process.argv.length; i++) {
    if ((process.argv[i] === '--port' || process.argv[i] === '-p') && process.argv[i + 1]) {
      const parsed = Number(process.argv[i + 1]);
      if (!isNaN(parsed) && parsed > 0) {
        cliPort = parsed;
        break;
      }
    }
  }

  // Determine listening port: prefer CLI --port, then 3000 in dev mode, then process.env.PORT (unless colliding with Nginx on 8080)
  let port = cliPort || (isDev ? 3000 : Number(process.env.PORT) || 3000);
  if (process.env.NGINX_PORT && String(port) === String(process.env.NGINX_PORT)) {
    port = Number(process.env.DEFAULT_APP_PORT) || 3000;
  }

  httpServer.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (0.0.0.0)`);
  });
}

createServer().catch((err) => {
  console.error('Critical server startup error:', err);
  process.exit(1);
});
