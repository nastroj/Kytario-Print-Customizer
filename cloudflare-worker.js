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

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

function extractPlaylistToken(rawUrl) {
  if (!rawUrl) return '';
  const queryMatch = rawUrl.match(/[?&]playlist=([^&#]+)/i);
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim();
    } catch {
      return queryMatch[1].trim();
    }
  }
  const pathMatch = rawUrl.match(/\/playlists\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    try {
      return decodeURIComponent(pathMatch[1]).trim();
    } catch {
      return pathMatch[1].trim();
    }
  }
  return '';
}

function cleanTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let text = rawTitle
    .replace(/\s*(?:\||-|–|—)\s*Kytario.*$/i, '')
    .replace(/\s*(?:\||-|–|—)\s*(?:Digitální zpěvník|Digital Songbook).*$/i, '')
    .replace(
      /\s*[\(\[](?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\)\]]/i,
      '',
    )
    .trim();
  const strippedLeading = text
    .replace(/^(?:Songbook|Zpěvník|Zpevnik|Digitální zpěvník|Digital Songbook)[\s:\-–—]+/i, '')
    .trim();
  const cleaned = strippedLeading || text || rawTitle.trim();
  const lower = cleaned.toLowerCase();
  if (
    !cleaned ||
    lower === 'kytario' ||
    lower === 'songbook' ||
    lower === 'zpěvník' ||
    lower === 'zpevnik' ||
    lower === 'digital songbook' ||
    lower === 'digitální zpěvník'
  ) {
    return '';
  }
  return cleaned;
}

function extractJsonArrayAfterMarker(html, markers) {
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractSongbooks(html) {
  return extractJsonArrayAfterMarker(html, ['"songbooks":', '\\"songbooks\\":'])
    .filter((item) => item?.urlToken)
    .map((item) => ({
      token: String(item.urlToken),
      name: String(item.name || item.title || ''),
    }));
}

function extractPlaylists(html) {
  if (!html || typeof html !== 'string') return [];
  return extractJsonArrayAfterMarker(html, ['"playlists":', '\\"playlists\\":']);
}

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .trim();
}

function isGenericTitle(text, token) {
  if (!text) return true;
  const lower = text.trim().toLowerCase();
  return (
    !lower ||
    lower === 'kytario' ||
    lower === 'songbook' ||
    lower === 'zpěvník' ||
    lower === 'zpevnik' ||
    lower === 'digital songbook' ||
    lower === 'digitální zpěvník' ||
    (token && lower === String(token).trim().toLowerCase())
  );
}

function extractH1(html, token) {
  if (!html || typeof html !== 'string') return '';
  for (const match of html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)) {
    const raw = decodeHtmlEntities(
      match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    )
      .replace(/\s*(?:\||-|–|—)\s*Kytario.*$/i, '')
      .trim();
    if (!isGenericTitle(raw, token)) return raw;
  }
  return '';
}

function extractTitleFromHtml(html, token) {
  if (!html || typeof html !== 'string') return '';

  const h1 = extractH1(html, token);
  if (h1) return h1;

  const metaPatterns = [
    /<meta\s+[^>]*?(?:property|name)=["'](?:og:title|twitter:title|title)["'][^>]*?content=["']([^"']+)["']/gi,
    /<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["'](?:og:title|twitter:title|title)["']/gi,
  ];
  for (const regex of metaPatterns) {
    for (const match of html.matchAll(regex)) {
      const cleaned = cleanTitle(decodeHtmlEntities(match[1]));
      if (!isGenericTitle(cleaned)) return cleaned;
    }
  }

  for (const match of html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)) {
    const cleaned = cleanTitle(decodeHtmlEntities(match[1]));
    if (!isGenericTitle(cleaned)) return cleaned;
  }

  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1]);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (obj) {
        const authorName = obj.author?.name || obj.byArtist?.name;
        const candidate =
          obj.songbookName || obj.headline || (obj.name !== authorName ? obj.name : null);
        if (candidate && typeof candidate === 'string') {
          const cleaned = cleanTitle(decodeHtmlEntities(candidate));
          if (!isGenericTitle(cleaned)) return cleaned;
        }
      }
    } catch {
      // Continue scanning structured data tags.
    }
  }

  return '';
}

function isPageForKytarioToken(pageUrl, token) {
  try {
    const parsedUrl = new URL(pageUrl);
    if (!['kytario.com', 'www.kytario.com'].includes(parsedUrl.hostname.toLowerCase())) {
      return false;
    }
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (['cs', 'sk', 'en', 'de', 'pl'].includes(segments[0]?.toLowerCase())) {
      segments.shift();
    }
    return (
      segments[0]?.toLowerCase() === String(token).toLowerCase() &&
      (segments.length === 1 || /^index(?:-\d+)?$/i.test(segments[1]))
    );
  } catch {
    return false;
  }
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
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': BROWSER_USER_AGENT,
        },
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

async function resolveSongbookTokenForPlaylist(playlistToken) {
  try {
    const response = await fetch('https://kytario.com/playlists', {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': BROWSER_USER_AGENT,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const regex = /href="\/([^/?"]+)(?:\/index(?:-\d+)?)?\?playlist=([^"&]+)"/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[2].toLowerCase() === playlistToken.toLowerCase()) {
        return { token: match[1], playlistToken: match[2] };
      }
    }
  } catch {
    // Ignore listing lookup timeout.
  }
  return null;
}

async function fetchPlaylistHtml(token, playlistToken, rawUrl) {
  const urls = [
    rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl.split('#')[0] : '',
    `https://kytario.com/${encodeURIComponent(token)}/index-1?playlist=${encodeURIComponent(playlistToken)}`,
    `https://kytario.com/cs/${encodeURIComponent(token)}/index-1?playlist=${encodeURIComponent(playlistToken)}`,
    `https://kytario.com/${encodeURIComponent(token)}?playlist=${encodeURIComponent(playlistToken)}`,
  ].filter(Boolean);

  try {
    return await Promise.any(
      [...new Set(urls)].map(async (pageUrl) => {
        const response = await fetch(pageUrl, {
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': BROWSER_USER_AGENT,
          },
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const playlists = extractPlaylists(html);
        if (playlists.length === 0) throw new Error('No playlists in HTML');
        return { playlists, pageHtml: html };
      }),
    );
  } catch {
    return { playlists: [], pageHtml: '' };
  }
}

async function fetchSongbookPayload(token) {
  const candidates = [...new Set([token, token.toLowerCase(), token.toUpperCase()])];
  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://kytario.com/api/songbooks/${encodeURIComponent(candidate)}/sections`,
        {
          headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': BROWSER_USER_AGENT,
          },
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

async function fetchSongbookTitle(token, rawUrl = '') {
  if (!token) return '';
  const candidateTokens = [...new Set([token, token.toLowerCase(), token.toUpperCase()])];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  const pdfLookups = candidateTokens.map(async (cand) => {
    const pdfUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(cand)}/pdf`;
    const response = await fetch(pdfUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const disposition = response.headers.get('content-disposition') || '';
    const match =
      disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="([^"]+)"/i);
    if (!match?.[1]) throw new Error('No filename header');
    let filename = match[1];
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // Keep original filename if percent-decoding fails.
    }
    filename = cleanTitle(filename.replace(/\.pdf$/i, '').trim());
    if (isGenericTitle(filename)) throw new Error('Generic filename');
    controller.abort();
    return filename;
  });

  const pageCandidates = [];
  if (
    rawUrl &&
    /^https?:\/\//i.test(rawUrl) &&
    !rawUrl.includes('/api/') &&
    isPageForKytarioToken(rawUrl.split('#')[0], token)
  ) {
    pageCandidates.push(rawUrl.split('#')[0]);
  }
  for (const tok of candidateTokens.slice(0, 2)) {
    const enc = encodeURIComponent(tok);
    pageCandidates.push(
      `https://kytario.com/${enc}`,
      `https://kytario.com/cs/${enc}`,
      `https://kytario.com/${enc}/index-1`,
    );
  }

  const pageLookups = [...new Set(pageCandidates)].map(async (pageUrl) => {
    const response = await fetch(pageUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': BROWSER_USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const finalUrl = response.url || pageUrl;
    if (!isPageForKytarioToken(finalUrl, token)) throw new Error('Redirected away');
    const title = extractTitleFromHtml(await response.text(), token);
    if (!title) throw new Error('No title in HTML');
    controller.abort();
    return title;
  });

  try {
    return await Promise.any([...pdfLookups, ...pageLookups]);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

function buildPlaylistPayload({
  matchedPlaylist,
  playlistToken,
  sectionsData,
  resolvedToken,
  webTitle,
  rawUrl,
}) {
  const allSongbookSongs = sectionsData.songbookSongs || sectionsData.songs || [];
  const songMap = new Map();
  for (const item of allSongbookSongs) {
    const s = item?.song || item;
    if (!s) continue;
    if (s.id !== undefined && s.id !== null) songMap.set(String(s.id), s);
    if (s.urlToken) songMap.set(String(s.urlToken), s);
    if (s.name) songMap.set(String(s.name).toLowerCase(), s);
    if (s.title) songMap.set(String(s.title).toLowerCase(), s);
  }

  const rawPlaylistSongs =
    matchedPlaylist.songs ||
    matchedPlaylist.items ||
    matchedPlaylist.playlistSongs ||
    matchedPlaylist.tracks ||
    [];

  const plSongs = [...rawPlaylistSongs].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const resolvedSongs = plSongs.map((plItem, idx) => {
    const plSong = plItem?.song || plItem || {};
    const songId = String(plSong.id || plSong.songId || plSong.urlToken || '');
    const fullSong =
      (songId ? songMap.get(songId) : null) ||
      (plSong.urlToken ? songMap.get(String(plSong.urlToken)) : null) ||
      (plSong.name ? songMap.get(String(plSong.name).toLowerCase()) : null) ||
      (plSong.title ? songMap.get(String(plSong.title).toLowerCase()) : null) ||
      plSong;

    const transposition =
      plItem?.transposition !== undefined
        ? plItem.transposition
        : fullSong.transposition !== undefined
          ? fullSong.transposition
          : plSong.transposition;

    const capo =
      plItem?.capo !== undefined
        ? plItem.capo
        : fullSong.capo !== undefined
          ? fullSong.capo
          : plSong.capo;

    return {
      ...fullSong,
      id: fullSong.id || plSong.id || `pl-song-${idx + 1}`,
      name: fullSong.name || plSong.name,
      title: fullSong.title || plSong.name || fullSong.name,
      author: fullSong.author || plSong.author,
      interpreter: fullSong.interpreter || plSong.interpreter,
      capo,
      transposition,
      orderIndex: plItem?.orderIndex !== undefined ? plItem.orderIndex : idx,
    };
  });

  const rawBaseTitle = webTitle || sectionsData.title || sectionsData.name || 'Songbook';
  const baseTitle = cleanTitle(rawBaseTitle);
  const plName = matchedPlaylist.name || matchedPlaylist.title || playlistToken;
  const combinedTitle =
    plName && !baseTitle.toLowerCase().includes(plName.toLowerCase())
      ? `${baseTitle} - ${plName}`
      : plName || baseTitle;

  const songbookUrl =
    rawUrl && /^https?:\/\//i.test(rawUrl)
      ? rawUrl.split('#')[0]
      : `https://kytario.com/${encodeURIComponent(resolvedToken)}/index-1?playlist=${encodeURIComponent(playlistToken)}`;

  return {
    id: matchedPlaylist.id || sectionsData.id,
    title: combinedTitle,
    name: combinedTitle,
    songbookTitle: combinedTitle,
    playlistName: plName,
    urlToken: resolvedToken,
    playlistUrlToken: matchedPlaylist.urlToken || playlistToken,
    url: songbookUrl,
    shortUrl: songbookUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, ''),
    slug: resolvedToken,
    songs: resolvedSongs,
  };
}

function jsonResponse(data, status, corsHeaders, cacheControl = 'public, max-age=300, s-maxage=600') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
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
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders, 'no-store');
    }

    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get('url') || '';
    let playlistToken =
      requestUrl.searchParams.get('playlist') || extractPlaylistToken(rawUrl) || '';
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
          'no-store',
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
          if (['cs', 'sk', 'en', 'de', 'pl'].includes(segments[0]?.toLowerCase())) segments.shift();
          if (segments[0]?.toLowerCase() === 'api' && segments[1]?.toLowerCase() === 'songbooks' && segments[2]) {
            token = segments[2];
          } else if (segments.length) {
            token = segments[0];
          }
        }
      } catch {
        token = rawUrl.trim();
      }
    }
    if (!token) {
      const segments = requestUrl.pathname.split('/').filter(Boolean);
      token = requestUrl.searchParams.get('token') || segments.at(-1) || '';
    }

    if (playlistToken && (!token || token.toLowerCase() === 'playlists')) {
      const resolved = await resolveSongbookTokenForPlaylist(playlistToken);
      if (resolved) {
        token = resolved.token;
        playlistToken = resolved.playlistToken;
      }
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return jsonResponse(
        { error: 'Invalid or missing Kytario songbook token.' },
        400,
        corsHeaders,
      );
    }

    try {
      if (playlistToken && token.toLowerCase() !== 'playlists') {
        const [playlistResult, result] = await Promise.all([
          fetchPlaylistHtml(token, playlistToken, rawUrl),
          fetchSongbookPayload(token),
        ]);

        if (!result) {
          return jsonResponse(
            { error: `Kytario songbook "${token}" was not found.` },
            404,
            corsHeaders,
          );
        }

        const playlists = playlistResult.playlists || [];
        const matchedPlaylist =
          playlists.find(
            (p) =>
              (p.urlToken && p.urlToken.toLowerCase() === playlistToken.toLowerCase()) ||
              String(p.id) === playlistToken ||
              (p.name && p.name.toLowerCase() === playlistToken.toLowerCase()),
          ) || (playlists.length > 0 ? playlists[0] : null);

        if (matchedPlaylist) {
          const htmlTitle = extractTitleFromHtml(playlistResult.pageHtml, result.token);
          const webTitle =
            htmlTitle || (await fetchSongbookTitle(result.token, rawUrl));

          const playlistPayload = buildPlaylistPayload({
            matchedPlaylist,
            playlistToken,
            sectionsData: result.payload,
            resolvedToken: result.token,
            webTitle,
            rawUrl,
          });
          return jsonResponse(
            playlistPayload,
            200,
            corsHeaders,
            webTitle ? 'public, max-age=300, s-maxage=600' : 'no-store',
          );
        }
      }

      const [result, title] = await Promise.all([
        fetchSongbookPayload(token),
        fetchSongbookTitle(token, rawUrl),
      ]);
      if (!result) {
        return jsonResponse(
          { error: `Kytario songbook "${token}" was not found.` },
          404,
          corsHeaders,
          'no-store',
        );
      }

      const canonicalUrl = `https://kytario.com/${encodeURIComponent(result.token)}${
        playlistToken ? `?playlist=${encodeURIComponent(playlistToken)}` : ''
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
      return jsonResponse(
        payload,
        200,
        corsHeaders,
        resolvedTitle === 'Songbook' ? 'no-store' : 'public, max-age=300, s-maxage=600',
      );
    } catch (error) {
      return jsonResponse(
        { error: error?.message || 'Kytario import failed.' },
        502,
        corsHeaders,
        'no-store',
      );
    }
  },
};
