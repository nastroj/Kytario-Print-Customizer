interface WorkerEnv {
  ALLOWED_ORIGINS?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://nastroj.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const API_PATH = '/api/proxy/kytario/';

function jsonResponse(data: unknown, status: number, origin?: string): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function extractSlug(input: string): string {
  const clean = input.trim().split(/[?#]/, 1)[0].replace(/\/+$/, '');
  const noProtocol = clean.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const domainIndex = noProtocol.toLowerCase().indexOf('kytario.com');
  const path = domainIndex >= 0 ? noProtocol.slice(domainIndex + 'kytario.com'.length) : noProtocol;
  const segments = path.split('/').filter(Boolean);
  const ignored = new Set([
    'api', 'v1', 'v2', 'public', 'songbook', 'songbooks', 'zpevnik', 'zpevniky',
    'project', 'projects', 'sections', 'export', 'shared', 'cs', 'en', 'sk', 'de',
    'user', 'users',
  ]);

  for (let index = 0; index < segments.length - 1; index++) {
    if (['songbooks', 'songbook', 'zpevnik', 'zpevniky', 'projects', 'project'].includes(segments[index].toLowerCase())) {
      const next = segments[index + 1];
      if (!ignored.has(next.toLowerCase())) return next;
    }
  }

  return segments.filter((segment) => !ignored.has(segment.toLowerCase())).at(-1) || '';
}

function hasSongsPayload(data: any): boolean {
  return Boolean(data) && (
    (Array.isArray(data) && data.length > 0) ||
    (Array.isArray(data.songs) && data.songs.length > 0) ||
    (Array.isArray(data.songbookSongs) && data.songbookSongs.length > 0) ||
    (Array.isArray(data.sections) && data.sections.length > 0)
  );
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get('Origin') || undefined;
    const allowedOrigins = (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'Origin is not allowed.' }, 403);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed.' }, 405, origin);
    }
    if (!requestUrl.pathname.startsWith(API_PATH)) {
      return jsonResponse({ error: 'Not found.' }, 404, origin);
    }

    const input = requestUrl.searchParams.get('url') || requestUrl.searchParams.get('token') ||
      requestUrl.pathname.slice(API_PATH.length);
    const token = extractSlug(input);
    if (!/^[\p{L}\p{N}._-]{1,160}$/u.test(token)) {
      return jsonResponse({ error: 'Invalid Kytario songbook URL or code.' }, 400, origin);
    }

    const encodedToken = encodeURIComponent(token);
    const endpoints = [
      `https://kytario.com/api/songbooks/${encodedToken}/sections`,
      `https://kytario.com/api/v1/songbooks/${encodedToken}/sections`,
      `https://kytario.com/api/songbooks/${encodedToken}`,
      `https://kytario.com/api/v1/songbooks/${encodedToken}`,
      `https://kytario.com/api/songbooks/slug/${encodedToken}`,
      `https://kytario.com/api/public/songbooks/${encodedToken}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const upstream = await fetch(endpoint, {
          headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': 'Kytario-Print-Customizer/1.0',
          },
          signal: AbortSignal.timeout(3500),
        });
        if (!upstream.ok) continue;

        const data = await upstream.json();
        if (hasSongsPayload(data)) {
          return jsonResponse(data, 200, origin);
        }
      } catch {
        // Try the next supported public Kytario endpoint.
      }
    }

    return jsonResponse({ error: `Songbook "${token}" was not found on Kytario.` }, 404, origin);
  },
};