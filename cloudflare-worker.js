/**
 * Cloudflare Worker for Kytario songbook imports on static hosts.
 *
 * Deploy this Worker and configure VITE_KYTARIO_PROXY_URL in the GitHub
 * repository's Actions variables to enable reliable URL imports on Pages.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://nastroj.github.io',
  'http://localhost:3000',
  'http://localhost:4173',
];

function getCorsHeaders(origin, env) {
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ]);
  if (origin && !allowedOrigins.has(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin || 'https://nastroj.github.io',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function getProjectSlug(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    if (!['kytario.com', 'www.kytario.com'].includes(url.hostname.toLowerCase())) return '';
    const segments = url.pathname.split('/').filter(Boolean);
    if (['cs', 'sk', 'en', 'de'].includes(segments[0]?.toLowerCase())) segments.shift();
    const projectIndex = segments.findIndex((part) =>
      ['projekty', 'projects'].includes(part.toLowerCase()),
    );
    return projectIndex >= 0 ? segments[projectIndex + 1] || '' : '';
  } catch {
    return '';
  }
}

function extractSongbooks(html) {
  const markers = ['"songbooks":', '\\"songbooks\\":'];
  let marker = '';
  let index = -1;
  for (const candidate of markers) {
    index = html.indexOf(candidate);
    if (index >= 0) {
      marker = candidate;
      break;
    }
  }
  if (index < 0) return [];

  const arrayStart = html.indexOf('[', index + marker.length);
  if (arrayStart < 0) return [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let arrayEnd = -1;

  for (let i = arrayStart; i < html.length; i++) {
    const char = html[i];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === '[') depth++;
      if (char === ']' && --depth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }
  if (arrayEnd < 0) return [];

  let json = html.slice(arrayStart, arrayEnd);
  if (marker.startsWith('\\')) {
    json = json
      .replace(/\\\\\"/g, '"')
      .replace(/\\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item?.urlToken)
          .map((item) => ({
            token: String(item.urlToken),
            name: String(item.name || item.title || ''),
          }))
      : [];
  } catch {
    return [];
  }
}

function extractH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return match[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchProjectSongbook(rawUrl, projectSlug) {
  const urls = [
    rawUrl,
    `https://kytario.com/cs/projekty/${encodeURIComponent(projectSlug)}`,
    `https://kytario.com/projects/${encodeURIComponent(projectSlug)}`,
    `https://kytario.com/sk/projekty/${encodeURIComponent(projectSlug)}`,
  ].filter(Boolean);

  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) continue;
      const songbook = extractSongbooks(await response.text()).find((item) => item.token);
      if (songbook) return songbook;
    } catch {
      // Try the next canonical project route.
    }
  }
  return null;
}

async function fetchSongbookPayload(token) {
  const candidates = [...new Set([token, token.toLowerCase(), token.toUpperCase()])];
  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://kytario.com/api/songbooks/${encodeURIComponent(candidate)}/sections`,
        {
          headers: { Accept: 'application/json, text/plain, */*' },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) continue;
      const payload = await response.json();
      if (
        !Array.isArray(payload?.songbookSongs) &&
        !Array.isArray(payload?.songs) &&
        !Array.isArray(payload?.sections)
      ) {
        continue;
      }
      return { payload, token: candidate };
    } catch {
      // Try another token casing only after the canonical token fails.
    }
  }
  return null;
}

async function fetchSongbookTitle(token) {
  const pdfUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(token)}/pdf`;
  try {
    const response = await fetch(pdfUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    const disposition = response.headers.get('content-disposition') || '';
    const match =
      disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="([^"]+)"/i);
    if (response.ok && match?.[1]) {
      let filename = match[1];
      try {
        filename = decodeURIComponent(filename);
      } catch {
        // Keep the original filename if it is not valid percent-encoding.
      }
      filename = filename.replace(/\.pdf$/i, '').trim();
      if (filename && filename.toLowerCase() !== token.toLowerCase()) return filename;
    }
  } catch {
    // Fall back to the exact songbook pages.
  }

  const pages = await Promise.all(
    [token, `${token}/index-1`].map(async (path) => {
      try {
        const response = await fetch(`https://kytario.com/${path}`, {
          headers: { Accept: 'text/html,application/xhtml+xml' },
          signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) return '';
        const finalUrl = new URL(response.url);
        const finalSegments = finalUrl.pathname.split('/').filter(Boolean);
        if (finalSegments[0]?.toLowerCase() !== token.toLowerCase()) return '';
        return extractH1(await response.text());
      } catch {
        return '';
      }
    }),
  );
  return pages.find(Boolean) || '';
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

export default {
  async fetch(request, env = {}) {
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin, env);
    if (!corsHeaders) return new Response('Origin not allowed', { status: 403 });

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get('url') || '';
    const projectSlug = getProjectSlug(rawUrl);
    let token = requestUrl.searchParams.get('token') || '';
    let projectName = '';

    if (projectSlug) {
      const projectSongbook = await fetchProjectSongbook(rawUrl, projectSlug);
      if (!projectSongbook) {
        return jsonResponse(
          { error: `No songbook found for project "${projectSlug}".` },
          404,
          corsHeaders,
        );
      }
      token = projectSongbook.token;
      projectName = projectSongbook.name;
    }

    if (!token && rawUrl) {
      try {
        const input = new URL(rawUrl);
        if (['kytario.com', 'www.kytario.com'].includes(input.hostname.toLowerCase())) {
          const segments = input.pathname.split('/').filter(Boolean);
          if (['cs', 'sk', 'en', 'de'].includes(segments[0]?.toLowerCase())) segments.shift();
          if (segments.length) token = segments[0];
        }
      } catch {
        token = rawUrl.trim();
      }
    }
    if (!token) {
      const segments = requestUrl.pathname.split('/').filter(Boolean);
      token = requestUrl.searchParams.get('token') || segments.at(-1) || '';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return jsonResponse(
        { error: 'Invalid or missing Kytario songbook token.' },
        400,
        corsHeaders,
      );
    }

    try {
      const [result, title] = await Promise.all([
        fetchSongbookPayload(token),
        fetchSongbookTitle(token),
      ]);
      if (!result) {
        return jsonResponse(
          { error: `Kytario songbook "${token}" was not found.` },
          404,
          corsHeaders,
        );
      }

      const playlist = requestUrl.searchParams.get('playlist');
      const canonicalUrl = `https://kytario.com/${encodeURIComponent(result.token)}${
        playlist ? `?playlist=${encodeURIComponent(playlist)}` : ''
      }`;
      const resolvedTitle =
        title ||
        projectName ||
        result.payload.songbookTitle ||
        result.payload.title ||
        result.payload.name ||
        'Songbook';
      const payload = {
        ...result.payload,
        title: resolvedTitle,
        name: resolvedTitle,
        songbookTitle: resolvedTitle,
        urlToken: result.token,
        slug: result.token,
        url: canonicalUrl,
        shortUrl: canonicalUrl.replace(/^https?:\/\//i, ''),
      };
      return jsonResponse(payload, 200, corsHeaders);
    } catch (error) {
      return jsonResponse({ error: error?.message || 'Kytario import failed.' }, 502, corsHeaders);
    }
  },
};
