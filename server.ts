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

  async function fetchKytarioWebpageTitle(token: string): Promise<string | null> {
    if (!token) return null;
    try {
      const res = await axios.get(`https://kytario.com/${token}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 6000
      });
      const html = res.data;
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
    } catch (e) {
      return null;
    }
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

            // Fetch human-readable songbook name from Kytario public webpage if token exists
            if (token) {
              try {
                const webTitle = await fetchKytarioWebpageTitle(token);
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

    console.warn(`[Proxy] Songbook request failed for input "${rawInput}" (token "${token}"):`, lastError?.message);
    const status = lastError?.response?.status || 404;
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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

