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

  function cleanSongbookTitle(rawTitle: string): string {
    if (!rawTitle || typeof rawTitle !== 'string') return '';
    let text = rawTitle.trim();

    // Strip trailing site brand identifiers
    text = text.replace(/\s*(?:\||-|–|—)\s*Kytario.*$/i, '').trim();
    text = text.replace(/\s*(?:\||-|–|—)\s*(?:Digitální zpěvník|Digital Songbook).*$/i, '').trim();

    // Strip parenthesized or bracketed terms
    text = text.replace(/\s*[\(\[](?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\)\]]/i, '').trim();

    // Strip leading prefixes like "Songbook Písničky", "Songbook: Písničky", "Songbook - Písničky", "Zpěvník Písničky"
    const strippedLeading = text.replace(/^(?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\s:\-–—]+/i, '').trim();
    if (strippedLeading) {
      text = strippedLeading;
    }

    // Strip trailing "Songbook" / "Zpěvník" if preceded by space/dash
    const strippedTrailing = text.replace(/[\s:\-–—]+(?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)$/i, '').trim();
    if (strippedTrailing) {
      text = strippedTrailing;
    }

    return text || rawTitle.trim();
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

  function extractTitleFromHtml(html: string): string | null {
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

  async function fetchKytarioWebpageTitle(token: string, rawUrl?: string): Promise<string | null> {
    if (!token && !rawUrl) return null;
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

    for (const pageUrl of uniqueUrls) {
      try {
        const res = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 6000
        });
        const html = res.data;
        if (typeof html === 'string') {
          const title = extractTitleFromHtml(html);
          if (title) {
            return title;
          }
        }
      } catch (e) {
        // Try next candidate URL
      }
    }
    return null;
  }

  // Kytario API Proxy with robust endpoint fallbacks
  app.all(['/api/proxy/kytario', '/api/proxy/kytario/:token(*)'], async (req, res) => {
    let rawInput = (req.query.url as string) || (req.query.token as string) || (req.params as any).token || (req.params as any)[0] || '';
    rawInput = cleanKytarioUrl(rawInput);
    const token = extractKytarioSlug(rawInput);
    console.log(`[Proxy] Fetching songbook for input: "${rawInput}", resolved token: "${token}"`);

    const candidateUrls: string[] = [];

    // If input is an absolute URL to a sections or api endpoint, try it directly first
    if (/^https?:\/\//i.test(rawInput.trim())) {
      const urlCandidate = rawInput.trim().split('#')[0];
      // Only add if it doesn't end with an ignored keyword like /cs or /en
      if (token || !/(?:\/|^)(?:cs|en|sk|de|api|songbooks?|zpevniky?)\/?$/i.test(urlCandidate)) {
        candidateUrls.push(urlCandidate);
      }
    }

    if (token) {
      candidateUrls.push(`https://kytario.com/api/songbooks/${token}/sections`);
      candidateUrls.push(`https://kytario.com/api/v1/songbooks/${token}/sections`);
      candidateUrls.push(`https://kytario.com/api/songbooks/${token}`);
      candidateUrls.push(`https://kytario.com/api/v1/songbooks/${token}`);
      candidateUrls.push(`https://kytario.com/api/songbooks/slug/${token}`);
      candidateUrls.push(`https://kytario.com/api/public/songbooks/${token}`);
    }

    if (!token && candidateUrls.length === 0) {
      console.warn(`[Proxy] Invalid or empty songbook token requested: "${rawInput}"`);
      return res.status(400).json({
        error: 'Invalid Kytario songbook link or code. Please enter a valid songbook name (e.g. "https://kytario.com/your-songbook").'
      });
    }

    const endpoints = Array.from(new Set(candidateUrls));
    let lastError = null;

    for (const targetUrl of endpoints) {
      try {
        const response = await axios.get(targetUrl, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 15000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status === 200
        });

        if (response.data) {
          let data = response.data;
          if (typeof data === 'string') {
            try { 
              data = JSON.parse(data); 
            } catch (e) { 
              continue; 
            }
          }

          // If the payload has songs or songbookSongs or sections, return immediately
          const hasSongs = 
            (data && Array.isArray(data.songbookSongs) && data.songbookSongs.length > 0) ||
            (Array.isArray(data) && data.length > 0) ||
            (data && Array.isArray(data.songs) && data.songs.length > 0) ||
            (data && Array.isArray(data.sections) && data.sections.length > 0);

          if (hasSongs) {
            console.log(`[Proxy] Successfully retrieved songbook payload from: ${targetUrl}`);

            // Fetch human-readable songbook name from Kytario public webpage if token or rawInput exists
            if (token || rawInput) {
              try {
                const webTitle = await fetchKytarioWebpageTitle(token, rawInput);
                if (webTitle) {
                  console.log(`[Proxy] Enriched songbook title from Kytario page: "${webTitle}"`);
                  data.title = webTitle;
                  data.name = webTitle;
                  data.songbookTitle = webTitle;
                }
              } catch (e) {
                // Ignore title enrichment failure
              }
            }

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
      console.warn(`[Proxy] Songbook request failed for input "${rawInput}" (token "${token}"):`, lastError?.message);
    }
    res.status(status).json({ 
      error: status === 404 
        ? `Songbook "${token || rawInput}" was not found on Kytario. Please check the URL or code.` 
        : 'Failed to fetch songbook from Kytario. Please check the URL or code.',
      details: lastError?.message 
    });
  });

  if (!isProd) {
    console.log('Starting in development mode with Vite middleware...');
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server: httpServer },
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

  const port = process.env.PORT || 3000;
  httpServer.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (0.0.0.0)`);
  });
}

createServer().catch(err => {
  console.error('Critical server startup error:', err);
  process.exit(1);
});

